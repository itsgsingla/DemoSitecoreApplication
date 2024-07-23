using Demo.Foundation.ORM.Models;
using Glass.Mapper.Sc.Configuration.Attributes;
using System.Collections.Generic;

namespace Demo.Project.Website.Models
{
    [SitecoreType(TemplateId = TemplateIdConstants.BasePageConstants.TemplateId)]
    public interface IBasePage : IGlassBase
    {
        [SitecoreField(FieldId = TemplateIdConstants.BasePageConstants.TitleId)]
        string Title { get; set; }

        [SitecoreField(FieldId = TemplateIdConstants.BasePageConstants.DescriptionId)]
        string Description { get; set; }

        [SitecoreChildren]
        IEnumerable<IBasePage> ChildPages { get; set; }
    }
}
